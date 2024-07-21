import React, { useState, useEffect } from "react";
import AddPersonModal from "./AddPersonModal";
import axios from "axios";
import {
  Button,
  Card,
  CardHeader,
  CardFooter,
  Input,
  Pagination,
  PaginationItem,
  PaginationLink,
  Table,
  Container,
  Row,
} from "reactstrap";
import Header from "components/Headers/ElementHeader";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import EditPersonModal from "./EditPersonModal";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const decodeToken = (token) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64));
  return payload;
};

const Persons = () => {
  const [people, setPeople] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [peoplePerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [buttonWidth, setButtonWidth] = useState('auto');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState(null);

  const token = localStorage.getItem('token'); 
  const decodedToken = token ? decodeToken(token) : {};
  const currentUserId = decodedToken.AdminID;

  const fetchPeople = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/people");
      const filteredPeople = response.data.filter(person => person.createdBy === currentUserId);
      setPeople(filteredPeople);
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/entreprise");
      setCompanies(response.data);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  useEffect(() => {
    fetchPeople();
    fetchCompanies();
  }, []);

  const refreshPeople = () => {
    fetchPeople();
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const getCompanyNameById = (id) => {
    const company = companies.find(company => company._id === id);
    return company ? company.nom : <span className="ni ni-fat-delete" style={{ fontSize: '20px', color: 'blac' }}></span>;
  };
  
  const filteredPeople = people.filter((person) =>
    person.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCompanyNameById(person.entreprise).toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.pays.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.telephone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 576) {
        setButtonWidth('100%');
      } else {
        setButtonWidth('auto');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Get current people
  const indexOfLastPerson = currentPage * peoplePerPage;
  const indexOfFirstPerson = indexOfLastPerson - peoplePerPage;
  const currentPeople = filteredPeople.slice(indexOfFirstPerson, indexOfLastPerson);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Toggle modals
  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const toggleDeleteModal = () => {
    setDeleteModalOpen(!deleteModalOpen);
  };

  const handleDeleteClick = (id) => {
    setPersonToDelete(id);
    toggleDeleteModal();
  };

  const confirmDeletePerson = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/people/${personToDelete}`);
      refreshPeople();
      toggleDeleteModal();
      toast.success('Person deleted successfully', {
        autoClose: 2000, 
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } catch (error) {
      console.error("Error deleting person:", error);
    }
  };

  const toggleEditModal = () => {
    setEditModalOpen(!editModalOpen);
  };

  const handleEditClick = (person) => {
    setPersonToEdit(person);
    toggleEditModal();
  };

  return (
    <>
      <ToastContainer />
      <Header />
      <Container className="mt--7" fluid>
        <Row>
          <div className="col">
            <Card className="shadow">
              <CardHeader className="border-0 d-flex justify-content-between align-items-center">
                <h3 className="mb-0">Persons list</h3>
                <div className="d-flex">
                  <Input
                    type="text"
                    placeholder="Recherche"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="mr-3"
                  />
                  <Button color="primary" style={{ width: buttonWidth }} onClick={toggleModal}>Add new person</Button>
                </div>
              </CardHeader>
              <Table className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">First name</th>
                    <th scope="col">Last name</th>
                    <th scope="col">Company</th>
                    <th scope="col">Country</th>
                    <th scope="col">Tel</th>
                    <th scope="col">Email</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPeople.length > 0 ? (
                    currentPeople.map((person) => (
                      <tr key={person._id}>
                        <td>{person.prenom}</td>
                        <td>{person.nom}</td>
                        <td>{getCompanyNameById(person.entreprise)}</td>
                        <td>{person.pays}</td>
                        <td>{person.telephone}</td>
                        <td>{person.email}</td>
                        <td>
                          <span className="ni ni-settings-gear-65 text-primary" style={{ fontSize: '1.5rem', marginRight: '10px', cursor: 'pointer' }} onClick={() => handleEditClick(person)}></span>
                          <span className="ni ni-fat-remove text-danger" style={{ fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => handleDeleteClick(person._id)}></span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center text-danger">No matching records found</td>
                    </tr>
                  )}
                </tbody>
              </Table>
              <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                toggle={toggleDeleteModal}
                onConfirm={confirmDeletePerson}
              />
              <EditPersonModal
                isOpen={editModalOpen}
                toggle={toggleEditModal}
                person={personToEdit}
                refreshPeople={refreshPeople}
                userId={currentUserId} 
              />
              <CardFooter className="py-4">
                <nav aria-label="Page navigation example">
                  <Pagination
                    className="pagination justify-content-end mb-0"
                    listClassName="justify-content-end mb-0"
                  >
                    <PaginationItem disabled={currentPage === 1}>
                      <PaginationLink
                        onClick={() => paginate(currentPage - 1)}
                        tabIndex="-1"
                      >
                        <i className="fas fa-angle-left" />
                        <span className="sr-only">Previous</span>
                      </PaginationLink>
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(filteredPeople.length / peoplePerPage) }, (_, index) => (
                      <PaginationItem key={index + 1} active={index + 1 === currentPage}>
                        <PaginationLink onClick={() => paginate(index + 1)}>
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem disabled={currentPage === Math.ceil(filteredPeople.length / peoplePerPage)}>
                      <PaginationLink
                        onClick={() => paginate(currentPage + 1)}
                      >
                        <i className="fas fa-angle-right" />
                        <span className="sr-only">Next</span>
                      </PaginationLink>
                    </PaginationItem>
                  </Pagination>
                </nav>
              </CardFooter>
            </Card>
          </div>
        </Row>
      </Container>
      <AddPersonModal
        isOpen={modalOpen}
        toggle={toggleModal}
        refreshPeople={refreshPeople}
        userId={currentUserId} 
      />
    </>
  );
};

export default Persons;
